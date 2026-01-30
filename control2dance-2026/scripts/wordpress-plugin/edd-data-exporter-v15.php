<?php
/**
 * Plugin Name: EDD Data Exporter (v15 - ID MAPPER)
 * Description: Exporta el mapeo entre ID interno y Número de Pedido
 * Version: 15.0.0
 */

if (!defined('ABSPATH')) exit;

class EDD_Data_Exporter_V15 {
    
    public function __construct() {
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_post_export_edd_data_v15', [$this, 'handle_export']);
    }
    
    public function add_admin_menu() {
        add_menu_page('EDD Export v15', 'EDD Export v15', 'manage_options', 'edd-data-exporter-v15', [$this, 'admin_page'], 'dashicons-admin-links', 100);
    }
    
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1>🔗 Mapeador de IDs de Pedido (v15)</h1>
            <p>Este plugin genera el mapa necesario para cruzar el CSV de Stripe con nuestra base de datos nueva.</p>
            <form method="post" action="<?php echo admin_url('admin-post.php'); ?>">
                <input type="hidden" name="action" value="export_edd_data_v15">
                <?php wp_nonce_field('export_edd_data_v15', 'export_nonce'); ?>
                <?php submit_button('🚀 Exportar Mapa de IDs'); ?>
            </form>
        </div>
        <?php
    }
    
    public function handle_export() {
        if (!current_user_can('manage_options')) wp_die('Permisos insuficientes');
        check_admin_referer('export_edd_data_v15', 'export_nonce');
        
        global $wpdb;
        $orders = $wpdb->get_results("SELECT id, order_number FROM {$wpdb->prefix}edd_orders");
        
        $mapping = [];
        foreach ($orders as $order) {
            $mapping[$order->id] = $order->order_number;
        }
        
        $json = json_encode(['mapping' => $mapping], JSON_PRETTY_PRINT);
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="edd-id-mapping-v15-' . date('Y-m-d-His') . '.json"');
        echo $json; exit;
    }
}
new EDD_Data_Exporter_V15();
