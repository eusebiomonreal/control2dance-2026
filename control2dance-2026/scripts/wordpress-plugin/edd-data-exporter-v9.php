<?php
/**
 * Plugin Name: EDD Data Exporter (v9 - TABLE INSPECTOR)
 * Description: Lista todas las columnas y datos de wp_edd_orders para encontrar el ID
 * Version: 9.0.0
 */

if (!defined('ABSPATH')) exit;

class EDD_Data_Exporter_V9 {
    
    public function __construct() {
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_post_export_edd_data_v9', [$this, 'handle_export']);
    }
    
    public function add_admin_menu() {
        add_menu_page('EDD Export v9', 'EDD Export v9', 'manage_options', 'edd-data-exporter-v9', [$this, 'admin_page'], 'dashicons-admin-generic', 100);
    }
    
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1>🔍 Inspector de Tabla edd_orders (v9)</h1>
            <p>Este plugin va a listar TODAS las columnas existentes en la tabla <code>wp_edd_orders</code> y volcar los datos de los últimos 20 pedidos.</p>
            <form method="post" action="<?php echo admin_url('admin-post.php'); ?>">
                <input type="hidden" name="action" value="export_edd_data_v9">
                <?php wp_nonce_field('export_edd_data_v9', 'export_nonce'); ?>
                <?php submit_button('🚀 Inspeccionar Tabla edd_orders'); ?>
            </form>
        </div>
        <?php
    }
    
    public function handle_export() {
        if (!current_user_can('manage_options')) wp_die('Permisos insuficientes');
        check_admin_referer('export_edd_data_v9', 'export_nonce');
        
        global $wpdb;
        $table = "{$wpdb->prefix}edd_orders";
        
        $diag = [
            'exported_at' => current_time('mysql'),
            'columns' => $wpdb->get_results("SHOW COLUMNS FROM $table"),
            'sample_data' => $wpdb->get_results("SELECT * FROM $table ORDER BY id DESC LIMIT 20"),
        ];
        
        $json = json_encode($diag, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="edd-table-inspect-v9-' . date('Y-m-d-His') . '.json"');
        echo $json; exit;
    }
}
new EDD_Data_Exporter_V9();
