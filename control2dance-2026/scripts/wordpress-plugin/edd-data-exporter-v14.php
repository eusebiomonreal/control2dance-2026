<?php
/**
 * Plugin Name: EDD Data Exporter (v14 - META EXPLORER)
 * Description: Inspección profunda de wp_edd_ordermeta para encontrar IDs de Stripe
 * Version: 14.0.0
 */

if (!defined('ABSPATH')) exit;

class EDD_Data_Exporter_V14 {
    
    public function __construct() {
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_post_export_edd_data_v14', [$this, 'handle_export']);
    }
    
    public function add_admin_menu() {
        add_menu_page('EDD Export v14', 'EDD Export v14', 'manage_options', 'edd-data-exporter-v14', [$this, 'admin_page'], 'dashicons-visibility', 100);
    }
    
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1>🔬 Explorador de Metadatos (v14)</h1>
            <p>Este plugin va a analizar la tabla <code>wp_edd_ordermeta</code> para ver todas las llaves disponibles y una muestra de los datos.</p>
            <form method="post" action="<?php echo admin_url('admin-post.php'); ?>">
                <input type="hidden" name="action" value="export_edd_data_v14">
                <?php wp_nonce_field('export_edd_data_v14', 'export_nonce'); ?>
                <?php submit_button('🚀 Analizar wp_edd_ordermeta'); ?>
            </form>
        </div>
        <?php
    }
    
    public function handle_export() {
        if (!current_user_can('manage_options')) wp_die('Permisos insuficientes');
        check_admin_referer('export_edd_data_v14', 'export_nonce');
        
        global $wpdb;
        $table = "{$wpdb->prefix}edd_ordermeta";
        
        $diag = [
            'exported_at' => current_time('mysql'),
            'table_columns' => $wpdb->get_results("SHOW COLUMNS FROM $table"),
            // Listamos todas las llaves únicas para ver qué hay
            'unique_keys' => $wpdb->get_col("SELECT DISTINCT meta_key FROM $table LIMIT 200"),
            // Muestra de datos recientes
            'sample_data' => $wpdb->get_results("SELECT * FROM $table ORDER BY id DESC LIMIT 200"),
            // Muestra específica para un pedido de Stripe (por ejemplo, el último)
            'stripe_sample' => $this->get_last_stripe_meta()
        ];
        
        $json = json_encode($diag, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="edd-meta-explore-v14-' . date('Y-m-d-His') . '.json"');
        echo $json; exit;
    }

    private function get_last_stripe_meta() {
        global $wpdb;
        $order = $wpdb->get_row("SELECT id, order_number FROM {$wpdb->prefix}edd_orders WHERE gateway LIKE '%stripe%' ORDER BY id DESC LIMIT 1");
        if ($order) {
            return [
                'order_number' => $order->order_number,
                'order_id' => $order->id,
                'metas' => $wpdb->get_results($wpdb->prepare("SELECT * FROM {$wpdb->prefix}edd_ordermeta WHERE edd_order_id = %d", $order->id))
            ];
        }
        return null;
    }
}
new EDD_Data_Exporter_V14();
